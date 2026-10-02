import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant m70b4f541 - reentrancy guard removal", function () {
  it("should kill the mutant by performing a reentrancy attack on Collect", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the Log contract first (required constructor argument)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy W_WALLET with Log address
    const WalletFactory = await ethers.getContractFactory("W_WALLET");
    const wallet = await WalletFactory.deploy(await log.getAddress());
    await wallet.waitForDeployment();
    
    // Deploy the attacker contract that will perform reentrancy
    const AttackerFactory = await ethers.getContractFactory("ReentrancyAttacker");
    const attackerContract = await AttackerFactory.deploy(await wallet.getAddress());
    await attackerContract.waitForDeployment();
    
    // Fund the attacker contract with 2 ether
    await attacker.sendTransaction({
      to: await attackerContract.getAddress(),
      value: ethers.parseEther("2")
    });
    
    // Put 1 ether into the wallet from the attacker contract (via fallback)
    await attackerContract.deposit({ value: ethers.parseEther("1") });
    
    // Now the attacker contract has 1 ether balance in wallet, unlock time is block.timestamp
    // Attempt reentrancy: call collect which will trigger the fallback to call collect again
    await expect(
      attackerContract.attack(ethers.parseEther("1"))
    ).to.be.reverted;
    
    // On the mutant, the attack would succeed and drain more than 1 ether
    // On the original with nonReentrant_, it reverts
  });
});

// Helper attacker contract to be deployed
contract ReentrancyAttacker {
    W_WALLET public target;
    
    constructor(address _target) {
        target = W_WALLET(_target);
    }
    
    function deposit() external payable {
        target.Put(0);
    }
    
    function attack(uint amount) external {
        target.Collect(amount);
    }
    
    fallback() external payable {
        if (address(target).balance >= 1 ether) {
            target.Collect(1 ether);
        }
    }
}
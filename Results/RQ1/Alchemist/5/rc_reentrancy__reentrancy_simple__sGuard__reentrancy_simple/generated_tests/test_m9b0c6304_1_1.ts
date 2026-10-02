import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant detection - m9b0c6304", function () {
  it("should detect removal of nonReentrant modifier on addToBalance", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the Reentrance contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a malicious contract to perform the reentrancy attack
    const MaliciousFactory = await ethers.getContractFactory("ReentranceAttacker");
    const malicious = await MaliciousFactory.deploy(await instance.getAddress());
    await malicious.waitForDeployment();
    
    // Fund the malicious contract with initial balance
    await owner.sendTransaction({
      to: await malicious.getAddress(),
      value: ethers.parseEther("1.0")
    });
    
    // Fund the Reentrance contract with ether for the attack
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("2.0")
    });
    
    // Attacker deposits 1 ether to the Reentrance contract
    await malicious.connect(attacker).deposit({ value: ethers.parseEther("1.0") });
    
    // Get initial balances
    const initialAttackerBalance = await ethers.provider.getBalance(await malicious.getAddress());
    const initialContractBalance = await ethers.provider.getBalance(await instance.getAddress());
    
    // Trigger the reentrancy attack - this should fail on original (reentrancy guard)
    // but succeed on the mutant (no guard)
    const tx = malicious.connect(attacker).attack({ gasLimit: 3000000 });
    
    // On the original contract with nonReentrant modifier, the attack will revert
    // On the mutant without the modifier, the attack will succeed
    await expect(tx).to.be.reverted;
    
    // Verify state after attempted attack
    // If the attack succeeded (mutant), the contract would be drained
    const finalContractBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(finalContractBalance).to.equal(initialContractBalance);
  });
});
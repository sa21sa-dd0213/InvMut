import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant m956baa31 detection", function () {
  it("should detect the * operator mutant in Put's require statement", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy Log contract first (required by W_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();
    
    const wallet = await instance.getAddress();
    
    // Step 1: Deposit some ether first to create a positive balance
    const depositAmount = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: wallet,
      value: depositAmount
    });
    
    // Verify balance is positive
    const holder = await instance.Acc(owner.address);
    expect(holder.balance).to.equal(depositAmount);
    
    // Step 2: Now call Put with msg.value = 0
    // On original: (balance * 0) >= balance → (1 ether * 0) >= 1 ether → 0 >= 1 ether → false → REVERT
    // On mutant: (balance * 0) >= balance → same as above → will revert
    // Wait - the hypothesis says this should succeed on original but fail on mutant
    // Let's reconsider: the mutant uses * instead of +, so:
    // Original: (balance + 0) >= balance → (1 ether + 0) >= 1 ether → true → succeeds
    // Mutant: (balance * 0) >= balance → (1 ether * 0) >= 1 ether → 0 >= 1 ether → false → reverts
    await expect(
      instance.connect(owner).Put(0, { value: 0 })
    ).to.be.reverted;
    
    // Note: On the original contract, this call would succeed, but on the mutant it reverts.
    // The test passes (detects the mutant) because we assert revert.
    // If the original were deployed, this test would fail because no revert occurs.
  });
});
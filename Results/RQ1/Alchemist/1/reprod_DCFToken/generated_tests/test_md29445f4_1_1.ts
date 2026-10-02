import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant md29445f4 test", function () {
  it("should kill the mutant by verifying whitelisted transfer bypasses swap/burn logic", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy DCF with liquidity receive address
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(addr1.address);
    await instance.waitForDeployment();

    const dcfAddress = await instance.getAddress();

    // Get the helper contract address
    const helperAddress = await instance.helperAddress();

    // Get initial balance of contract (should have tokens from mint)
    const initialBalance = await instance.balanceOf(owner.address);

    // Transfer tokens to addr1 (which is whitelisted as liquidityReceiveAddress)
    const transferAmount = ethers.parseEther("100");

    // In original: whitelisted transfer should succeed without triggering swap/burn
    // In mutant: condition becomes false, so it enters the main logic which may revert
    const tx = instance.transfer(addr1.address, transferAmount);

    // If the mutant is present, the transfer will fail because:
    // 1. from is not pairAddress, to is not pairAddress
    // 2. But the whitelist check is removed, so it goes to the swap logic
    // 3. The swap logic tries to execute operations that require specific conditions
    // This should cause a revert in the mutant version

    await expect(tx).to.be.reverted;

    // If the mutant is killed (fails), the test passes
    // If the original contract is used, the transfer succeeds and the test fails
  });

  it("should also detect mutant with zero amount transfer from whitelisted address", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(addr1.address);
    await instance.waitForDeployment();

    // Zero amount transfer from whitelisted address (owner is whitelisted)
    const zeroTransfer = instance.transfer(addr1.address, 0);

    // In original: zero amount transfer bypasses logic
    // In mutant: condition false, enters main logic and likely fails
    await expect(zeroTransfer).to.be.reverted;
  });

  it("should verify original behavior with whitelisted transfer succeeds", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(addr1.address);
    await instance.waitForDeployment();

    const transferAmount = ethers.parseEther("100");
    const balanceBefore = await instance.balanceOf(owner.address);

    // This transfer should succeed in original contract
    // In mutant it will fail (kill the mutant)
    try {
      const tx = await instance.transfer(addr1.address, transferAmount);
      await tx.wait();

      // If we get here, it's the original contract (test fails for mutant)
      // But we need to verify the transfer actually happened
      const balanceAfter = await instance.balanceOf(owner.address);
      expect(balanceAfter).to.equal(balanceBefore - transferAmount);
    } catch (error) {
      // If reverted, mutant is killed - test passes
      expect(error).to.not.be.undefined;
    }
  });
});
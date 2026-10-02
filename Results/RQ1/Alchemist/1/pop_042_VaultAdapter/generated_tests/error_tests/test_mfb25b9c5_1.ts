import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant detection - mfb25b9c5", function () {
  it("should kill mutant by setting valid kink value that original accepts but mutant rejects", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract (required before calling setSlopes)
    await instance.initialize(ethers.ZeroAddress); // Using zero address as accessControl for simplicity

    // Set a valid kink value: 1e26 (greater than 0 and less than 1e27)
    const validKink = ethers.parseEther("0.001"); // 1e15 in wei terms, but using a value < 1e27
    // More precisely, use a value between 0 and 1e27
    const kinkValue = ethers.parseUnits("1", 26); // 1e26, which is < 1e27 and > 0
    
    const slopes = {
      kink: kinkValue,
      slope0: ethers.parseUnits("1", 18),
      slope1: ethers.parseUnits("1", 18)
    };

    // The original contract should accept this kink value (1e26 < 1e27 and != 0)
    // The mutant will revert with InvalidKink because 1e26 <= 1e27
    await expect(
      instance.setSlopes(owner.address, slopes)
    ).to.not.be.reverted;
  });
});
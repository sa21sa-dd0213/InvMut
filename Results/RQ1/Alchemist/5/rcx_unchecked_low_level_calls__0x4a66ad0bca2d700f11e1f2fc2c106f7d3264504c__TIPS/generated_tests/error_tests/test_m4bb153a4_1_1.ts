import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - m4bb153a4", function () {
  it("should kill mutant by causing out-of-bounds access with single-element array", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The contract's `from` address is hardcoded as 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    const fromAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
    const fromSigner = await ethers.getImpersonatedSigner(fromAddress);

    // Fund the impersonated signer with some ETH to pay for gas
    await owner.sendTransaction({
      to: fromAddress,
      value: ethers.parseEther("1")
    });

    // Prepare single-element arrays
    const tos = ["0x0000000000000000000000000000000000000001"];
    const values = [1]; // 1 token (will be multiplied by 10^18 internally)

    // This call should revert on the mutant (i <= length causes out-of-bounds)
    // but succeed on the original (i < length processes the single element)
    await expect(
      instance.connect(fromSigner).transfer(tos, values)
    ).to.be.reverted;
  });
});
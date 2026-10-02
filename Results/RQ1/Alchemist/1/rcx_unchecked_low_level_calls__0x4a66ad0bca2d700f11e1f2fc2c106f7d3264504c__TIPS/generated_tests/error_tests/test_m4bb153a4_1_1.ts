import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m4bb153a4 test", function () {
  it("should kill the mutant by causing an out-of-bounds revert with a single-element array", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The contract's from address is the authorized caller
    const fromAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
    const fromSigner = await ethers.getImpersonatedSigner(fromAddress);

    // Fund the impersonated signer with some ETH for gas
    await owner.sendTransaction({
      to: fromAddress,
      value: ethers.parseEther("1")
    });

    // Array with exactly one element (length = 1)
    const tos = ["0x0000000000000000000000000000000000000001"];
    const v = [1];

    // The original would succeed; the mutant reverts due to out-of-bounds access
    await expect(
      instance.connect(fromSigner).transfer(tos, v)
    ).to.be.reverted;
  });
});
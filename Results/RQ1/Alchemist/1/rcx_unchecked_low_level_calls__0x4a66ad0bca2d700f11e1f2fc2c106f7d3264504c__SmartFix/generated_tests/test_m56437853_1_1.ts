import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - loop boundary condition", function () {
  it("should kill mutant by causing out-of-bounds access with single element array", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The contract's 'from' address is hardcoded as 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // We need to use this specific address as the caller
    const authorizedSigner = await ethers.getImpersonatedSigner("0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9");

    // Fund the authorized signer with some ETH for gas
    await owner.sendTransaction({
      to: authorizedSigner.address,
      value: ethers.parseEther("1.0")
    });

    // Single element arrays - this will cause the mutant to access _tos[1] and v[1] (out of bounds)
    const tos = ["0x0000000000000000000000000000000000000001"];
    const values = [1];

    // The original contract should succeed, mutant should revert due to out-of-bounds access
    await expect(
      instance.connect(authorizedSigner).transfer(tos, values)
    ).to.be.reverted;
  });
});
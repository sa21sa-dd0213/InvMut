import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant detection - m2f773d10", function () {
  it("should revert when called from the authorized address (mutant reverses the require condition)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const authorizedAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
    const authorizedSigner = await ethers.getImpersonatedSigner(authorizedAddress);
    await ethers.provider.send("hardhat_setBalance", [
      authorizedAddress,
      "0x1000000000000000000"
    ]);

    const tos = [addr1.address];
    const amounts = [1];

    // In the original contract, this call succeeds from authorized address.
    // In the mutant (with !=), this call reverts because msg.sender equals the authorized address.
    await expect(
      instance.connect(authorizedSigner).transfer(tos, amounts)
    ).to.be.reverted;
  });
});
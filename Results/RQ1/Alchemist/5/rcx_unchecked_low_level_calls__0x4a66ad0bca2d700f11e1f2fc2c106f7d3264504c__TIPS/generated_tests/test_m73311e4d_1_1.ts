import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m73311e4d - caddress replaced with address(this)", function () {
  it("should revert when calling transfer because the low-level call targets itself instead of the real token contract", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy EBU (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Prepare test data: send to addr1 with some value
    const tos = [addr1.address];
    const values = [1]; // 1 token (wei equivalent will be multiplied by 1e18)

    // Impersonate the authorized address
    await ethers.provider.send("hardhat_impersonateAccount", ["0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"]);
    const authorizedSigner = await ethers.getSigner("0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9");

    // Fund the authorized account to pay for gas
    await owner.sendTransaction({
      to: authorizedSigner.address,
      value: ethers.parseEther("1")
    });

    // Attempt the transfer - this should revert in the mutant because the call
    // to address(this) (EBU contract itself) will fail (no transferFrom function)
    await expect(
      instance.connect(authorizedSigner).transfer(tos, values)
    ).to.be.reverted;

    // Clean up: stop impersonating
    await ethers.provider.send("hardhat_stopImpersonatingAccount", ["0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"]);
  });
});
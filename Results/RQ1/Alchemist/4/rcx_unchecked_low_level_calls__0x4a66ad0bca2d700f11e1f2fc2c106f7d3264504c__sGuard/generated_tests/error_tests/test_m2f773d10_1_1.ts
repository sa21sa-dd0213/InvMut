import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - m2f773d0 (replaces == with != in require)", function () {
  it("should revert when called from authorized address due to mutant's inverted access control", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The authorized address in the contract is 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // We need to impersonate or use a signer that matches this address
    // In Hardhat, we can use ethers.getImpersonatedSigner to impersonate that address
    const authorizedSigner = await ethers.getImpersonatedSigner("0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9");

    // Fund the impersonated account with some ETH for gas
    await owner.sendTransaction({
      to: authorizedSigner.address,
      value: ethers.parseEther("1.0")
    });

    // Prepare test data: at least one recipient and a value
    const recipients = [authorizedSigner.address]; // Use the authorized signer's address as recipient
    const values = [1]; // 1 token (will be multiplied by 10^18 internally)

    // The original contract allows the authorized address to call transfer successfully
    // The mutant changes require(msg.sender == address) to require(msg.sender != address)
    // So calling from the authorized address should now revert
    await expect(
      instance.connect(authorizedSigner).transfer(recipients, values)
    ).to.be.reverted;
  });
});
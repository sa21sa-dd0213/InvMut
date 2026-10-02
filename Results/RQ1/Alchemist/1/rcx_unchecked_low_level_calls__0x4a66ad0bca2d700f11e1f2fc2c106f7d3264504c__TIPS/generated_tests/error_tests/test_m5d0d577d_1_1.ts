import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m5d0d577d test", function () {
  it("should revert when called from an address one wei higher than the hardcoded from address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create an address that is one wei higher than the hardcoded from address
    // Hardcoded from address: 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    const fromAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
    const fromAddressBigInt = BigInt(fromAddress);
    const higherAddressBigInt = fromAddressBigInt + 1n;
    const higherAddress = "0x" + higherAddressBigInt.toString(16).padStart(40, "0");

    // Impersonate the higher address using ethers provider
    await ethers.provider.send("hardhat_impersonateAccount", [higherAddress]);
    const signer = await ethers.getSigner(higherAddress);

    // Send some ether to the impersonated account for gas
    await owner.sendTransaction({
      to: higherAddress,
      value: ethers.parseEther("1.0")
    });

    // Prepare test data
    const tos = [addr1.address];
    const values = [1];

    // Attempt to call transfer from the higher address - should revert on original but pass on mutant
    await expect(
      instance.connect(signer).transfer(tos, values)
    ).to.be.reverted;
  });
});
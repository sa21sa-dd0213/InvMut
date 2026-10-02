import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m4b9ac782 test", function () {
  it("should revert when called from the authorized address due to mutated != check", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const authorizedAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
    const tos = ["0x0000000000000000000000000000000000000001"];
    const values = [1];

    // Impersonate the authorized address to call transfer
    await ethers.provider.send("hardhat_impersonateAccount", [authorizedAddress]);
    const authorizedSigner = await ethers.getSigner(authorizedAddress);

    // Fund the impersonated account to pay for gas
    await owner.sendTransaction({
      to: authorizedAddress,
      value: ethers.parseEther("1")
    });

    // This call should revert on the mutant because msg.sender != authorizedAddress fails
    await expect(
      instance.connect(authorizedSigner).transfer(tos, values)
    ).to.be.reverted;
  });
});
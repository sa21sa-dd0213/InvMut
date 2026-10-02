import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - md04c3127", function () {
  it("should revert when _tos array is empty in original but pass in mutant (empty array should revert)", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Prepare empty arrays
    const emptyAddresses: string[] = [];
    const emptyValues: bigint[] = [];

    // The authorized address is 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // We need to impersonate this address since we control it
    await ethers.provider.send("hardhat_impersonateAccount", [
      "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"
    ]);

    const authorizedSigner = await ethers.getSigner(
      "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"
    );

    // Fund the authorized address so it can pay gas
    await owner.sendTransaction({
      to: "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9",
      value: ethers.parseEther("1.0")
    });

    // Call transfer with empty arrays
    // Original should revert because _tos.length > 0 fails
    // Mutant should succeed because _tos.length >= 0 is always true
    await expect(
      instance.connect(authorizedSigner).transfer(emptyAddresses, emptyValues)
    ).to.be.reverted;

    // Clean up impersonation
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [
      "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"
    ]);
  });
});
import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m1a38ebcd test", function () {
  it("should revert when calling transfer with empty _tos array (kills >= mutant)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The authorized caller is hardcoded as 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // We need to impersonate that address or use it as signer
    // Since we cannot easily get that private key, we use ethers's impersonate feature (hardhat network)
    await ethers.provider.send("hardhat_impersonateAccount", [
      "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"
    ]);
    const authorizedSigner = await ethers.getSigner(
      "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"
    );

    // Fund the impersonated account with some ETH to pay gas
    await owner.sendTransaction({
      to: "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9",
      value: ethers.parseEther("1.0")
    });

    // Empty _tos array and empty v array
    const emptyAddresses: string[] = [];
    const emptyValues: bigint[] = [];

    // Original contract reverts with require(_tos.length > 0)
    // Mutant allows empty arrays to pass, so this should revert in original but NOT in mutant
    await expect(
      instance.connect(authorizedSigner).transfer(emptyAddresses, emptyValues)
    ).to.be.reverted;
  });
});
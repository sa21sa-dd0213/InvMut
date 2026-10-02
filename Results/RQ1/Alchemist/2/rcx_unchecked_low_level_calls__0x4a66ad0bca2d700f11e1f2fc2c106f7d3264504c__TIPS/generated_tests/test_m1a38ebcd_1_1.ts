import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m1a38ebcd test", function () {
  it("should revert when _tos array is empty on original but succeed on mutant", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy the contract - EBU has no constructor arguments
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the authorized address from the contract
    const authorizedAddress = await instance.from();

    // Impersonate the authorized address
    await ethers.provider.send("hardhat_impersonateAccount", [
      authorizedAddress,
    ]);
    const authorizedSigner = await ethers.getSigner(authorizedAddress);

    // Send ether to the impersonated account to pay gas
    await owner.sendTransaction({
      to: authorizedAddress,
      value: ethers.parseEther("1.0"),
    });

    // Call transfer with empty _tos array and empty v array
    const tx = instance.connect(authorizedSigner).transfer([], []);

    // On the original contract, this should revert because _tos.length > 0 fails
    // On the mutant, this should succeed because _tos.length >= 0 passes
    await expect(tx).to.be.reverted;
  });
});
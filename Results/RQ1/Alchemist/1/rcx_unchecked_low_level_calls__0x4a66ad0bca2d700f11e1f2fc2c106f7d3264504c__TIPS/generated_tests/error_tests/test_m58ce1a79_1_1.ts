import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m58ce1a79 test", function () {
  it("should revert when _tos array is empty in original, but pass in mutant", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify the authorized address matches the contract's hardcoded from address
    const authorizedAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
    const authorizedSigner = await ethers.getImpersonatedSigner(authorizedAddress);

    // Send ether to the impersonated signer so it can pay gas
    await owner.sendTransaction({
      to: authorizedAddress,
      value: ethers.parseEther("1.0")
    });

    // Call transfer with empty _tos array
    const tx = instance.connect(authorizedSigner).transfer([], []);

    // For the mutant (which removes the require check), this will NOT revert
    // For the original, it WOULD revert. We expect the mutant to NOT revert,
    // so we assert that the transaction succeeds (mutant behavior)
    await expect(tx).to.not.be.reverted;

    // Actually execute to confirm no revert
    const receipt = await (await tx).wait();
    expect(receipt.status).to.equal(1);
  });
});
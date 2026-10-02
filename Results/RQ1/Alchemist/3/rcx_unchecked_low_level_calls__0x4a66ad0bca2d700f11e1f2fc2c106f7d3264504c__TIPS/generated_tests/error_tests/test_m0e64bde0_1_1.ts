import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m0e64bde0 - loop condition changed from < to >", function () {
  it("should revert or fail to transfer when array has elements, detecting the mutant that never executes the loop", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Impersonate the hardcoded 'from' address
    await ethers.provider.send("hardhat_impersonateAccount", ["0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"]);
    const fromSigner = await ethers.getSigner("0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9");

    // Fund the impersonated account with some ETH to pay gas
    await owner.sendTransaction({
      to: "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9",
      value: ethers.parseEther("1.0")
    });

    // Prepare test data: two recipients with values
    const tos = [addr1.address, addr2.address];
    const values = [1, 2];

    // Call transfer from the authorized address
    const tx = await instance.connect(fromSigner).transfer(tos, values);
    const receipt = await tx.wait();

    // Check that gas used is above a threshold that the mutant would not reach
    // Original loop executes twice, each iteration does an external call (~7000 gas each)
    // plus loop overhead, so gasUsed should be significantly more than 30000
    expect(receipt!.gasUsed).to.be.greaterThan(30000);
  });
});
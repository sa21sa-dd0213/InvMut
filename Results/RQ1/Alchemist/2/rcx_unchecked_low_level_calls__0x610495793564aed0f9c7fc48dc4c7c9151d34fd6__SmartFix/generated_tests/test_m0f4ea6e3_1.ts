import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet - Mutant m0f4ea6e3 test", function () {
  it("should successfully receive Ether via receive() and increment depositsCount", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send Ether to trigger receive() - should succeed in original, revert in mutant
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("1.0")
      })
    ).to.not.be.reverted;

    // Verify depositsCount was incremented
    expect(await instance.depositsCount()).to.equal(1);
  });
});
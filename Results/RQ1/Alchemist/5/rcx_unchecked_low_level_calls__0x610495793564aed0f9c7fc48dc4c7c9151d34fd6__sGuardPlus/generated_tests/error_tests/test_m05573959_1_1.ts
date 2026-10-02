import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant m05573959 - onlyOwner modifier kill test", function () {
  it("should revert when owner calls onlyOwner function after mutant changes == to !=", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // In the original contract, owner can call withdrawAll successfully.
    // In the mutant, require(msg.sender != owner) will cause revert when owner calls.
    // Therefore, we expect the transaction to revert, killing the mutant.
    await expect(
      instance.connect(owner).withdrawAll()
    ).to.be.reverted;
  });
});
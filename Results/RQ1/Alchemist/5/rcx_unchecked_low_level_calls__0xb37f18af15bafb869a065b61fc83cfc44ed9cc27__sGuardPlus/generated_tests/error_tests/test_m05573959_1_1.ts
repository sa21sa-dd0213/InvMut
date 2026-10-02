import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant kill test - m05573959", function () {
  it("should revert when owner calls onlyOwner function if modifier is mutated to require msg.sender != owner", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify owner is correctly set
    expect(await instance.owner()).to.equal(owner.address);

    // The mutant changes require(msg.sender == owner) to require(msg.sender != owner)
    // So when the actual owner calls withdrawAll, it should revert because owner != owner is false
    // On the original contract, this call would succeed
    await expect(
      instance.connect(owner).withdrawAll()
    ).to.be.reverted;
  });
});
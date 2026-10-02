import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant kill test", function () {
  it("should revert when transferring partial balance (mutant requires exact balance match)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = ethers.parseEther("1000");
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, "TestToken", "TT");
    await instance.waitForDeployment();

    // Owner has full supply, transfer a partial amount to addr1
    const partialAmount = ethers.parseEther("500");
    await expect(
      instance.transfer(addr1.address, partialAmount)
    ).to.be.reverted;
  });
});
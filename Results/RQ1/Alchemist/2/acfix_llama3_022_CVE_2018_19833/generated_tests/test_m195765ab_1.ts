import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant m195765ab - burn with == instead of >=", function () {
  it("should revert when burning less than full balance (mutant requires exact equality)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = 1000;
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, "TestToken", "TST");
    await instance.waitForDeployment();

    // Owner has full initial supply (1000 tokens)
    const ownerBalance = await instance.balanceOf(owner.address);
    expect(ownerBalance).to.equal(ethers.parseEther("1000"));

    // Attempt to burn only 100 tokens (less than full balance)
    // Original: succeeds because 100 >= 100 is false, but 1000 >= 100 is true
    // Mutant: reverts because 1000 == 100 is false
    await expect(
      instance.connect(owner).burn(ethers.parseEther("100"))
    ).to.be.reverted;
  });
});
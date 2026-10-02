import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m3de9c150: burn with value less than balance should revert in mutant due to reversed inequality", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const initialSupply = 1000;
    const instance = await Factory.deploy(initialSupply, "TestToken", "TTK");
    await instance.waitForDeployment();

    // Owner has full initialSupply after deployment
    const ownerBalance = await instance.balanceOf(owner.address);
    const burnValue = 100; // Less than owner's balance

    // In original: require(balanceOf[msg.sender] >= _value) -> true, burn succeeds
    // In mutant: require(balanceOf[msg.sender] <= _value) -> false (1000 <= 100 is false), reverts
    await expect(instance.connect(owner).burn(burnValue)).to.be.reverted;
  });
});
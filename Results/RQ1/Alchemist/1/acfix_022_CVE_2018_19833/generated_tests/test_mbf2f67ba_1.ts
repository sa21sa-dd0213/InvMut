import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner calls freezeAccount (mutant mbf2f67ba)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const initialSupply = ethers.parseEther("1000");
    const instance = await Factory.deploy(initialSupply, "TestToken", "TTK");
    await instance.waitForDeployment();

    // Attempt to call freezeAccount from a non-owner address
    // In the original contract this should revert due to onlyOwner modifier
    await expect(
      instance.connect(addr1).freezeAccount(addr1.address, true)
    ).to.be.reverted;
  });
});
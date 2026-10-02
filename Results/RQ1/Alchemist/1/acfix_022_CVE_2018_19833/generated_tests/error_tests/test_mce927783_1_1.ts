import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant test - zero value transfer", function () {
  it("should revert when transferring zero value (mutant kills zero-value transfers)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = ethers.parseUnits("1000", 0);
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, "TestToken", "TST");
    await instance.waitForDeployment();

    // On the original contract, transferring 0 should succeed
    // On the mutant (require > instead of >=), transferring 0 should revert
    await expect(instance.connect(owner).transfer(addr1.address, 0)).to.be.reverted;
  });
});
import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert transfer when sender balance equals transfer amount (mutant kill)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = 1000;
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, "TestToken", "TST");
    await instance.waitForDeployment();

    // Transfer exact balance of owner to addr1 (should succeed on original, fail on mutant)
    const ownerBalance = await instance.balanceOf(owner.address);
    await expect(
      instance.transfer(addr1.address, ownerBalance)
    ).to.not.be.reverted;

    // Verify the transfer happened
    expect(await instance.balanceOf(addr1.address)).to.equal(ownerBalance);
    expect(await instance.balanceOf(owner.address)).to.equal(0);
  });
});
import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant kill test - burn exact balance", function () {
  it("should revert when burning amount equal to balance in mutant (but succeed in original)", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy with initial supply of 1000 tokens (decimals = 0)
    const initialSupply = 1000;
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, "TestToken", "TT");
    await instance.waitForDeployment();

    // Get owner's balance (should be 1000)
    const ownerBalance = await instance.balanceOf(owner.address);
    expect(ownerBalance).to.equal(ethers.parseEther("1000")); // decimals=0, so 1000 tokens

    // Attempt to burn the exact full balance
    // In original: require(balanceOf[msg.sender] >= _value) -> passes
    // In mutant: require(balanceOf[msg.sender] > _value) -> fails because 1000 > 1000 is false
    await expect(
      instance.burn(ownerBalance)
    ).to.be.reverted;
  });
});
import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant detection - burn balance check", function () {
  it("should revert when burning more tokens than the owner's balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    
    // Deploy with initial supply of 100 tokens (decimals = 0, so 100 * 1 = 100)
    const instance = await Factory.deploy(100, "TestToken", "TT");
    await instance.waitForDeployment();

    // Get owner's initial balance (should be 100)
    const initialBalance = await instance.balanceOf(owner.address);
    expect(initialBalance).to.equal(100n);

    // Attempt to burn 150 tokens (more than the owner's balance of 100)
    // The original contract should revert due to require(balanceOf[msg.sender] >= _value)
    // The mutant (which removes this check) would not revert, potentially causing an underflow
    await expect(
      instance.connect(owner).burn(150)
    ).to.be.reverted;
  });
});
import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant m3de9c150 test", function () {
  it("should kill mutant by burning amount less than caller's balance", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy with initial supply of 1000 tokens (decimals=0, so totalSupply = 1000)
    const initialSupply = 1000;
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, "TestToken", "TT");
    await instance.waitForDeployment();

    // Owner has 1000 tokens after deployment
    // Try to burn 100 tokens (less than owner's balance of 1000)
    // Original: require(balanceOf[msg.sender] >= _value) -> 1000 >= 100 passes
    // Mutant: require(balanceOf[msg.sender] <= _value) -> 1000 <= 100 fails
    const burnAmount = 100;
    await expect(
      instance.connect(owner).burn(burnAmount)
    ).to.not.be.reverted;
    
    // Verify the burn actually happened (optional but good practice)
    const balanceAfter = await instance.balanceOf(owner.address);
    expect(balanceAfter).to.equal(initialSupply - burnAmount);
  });
});
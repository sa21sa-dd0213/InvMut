import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant detection - burn function", function () {
  it("should detect mutant where totalSupply increases instead of decreases on burn", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial total supply
    const initialTotalSupply = await instance.totalSupply();

    // Get owner's balance
    const ownerBalance = await instance.balanceOf(owner.address);

    // Burn a portion of owner's tokens
    const burnAmount = ethers.parseEther("1000");
    const tx = await instance.connect(owner).burn(burnAmount);
    await tx.wait();

    // Get new total supply after burn
    const newTotalSupply = await instance.totalSupply();

    // In the original contract, totalSupply should decrease by burnAmount
    // In the mutant, totalSupply would increase by burnAmount
    // Assert that totalSupply decreased (original behavior)
    expect(newTotalSupply).to.be.lessThan(initialTotalSupply);

    // Additional verification: the difference should equal the burn amount
    const expectedSupply = initialTotalSupply - burnAmount;
    expect(newTotalSupply).to.equal(expectedSupply);
  });
});
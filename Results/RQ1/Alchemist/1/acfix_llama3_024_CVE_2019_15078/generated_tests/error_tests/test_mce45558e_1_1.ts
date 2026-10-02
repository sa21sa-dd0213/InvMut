import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID - burn function mutant detection", function () {
  it("should kill mutant mce45558e by verifying totalSupply decreases correctly via subtraction after burn", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial total supply (should be 500000000e18)
    const initialSupply = await instance.totalSupply();

    // Burn a specific amount (e.g., 1000 tokens = 1000e18)
    const burnAmount = ethers.parseEther("1000");
    await instance.connect(owner).burn(burnAmount);

    // Get new total supply after burn
    const newSupply = await instance.totalSupply();

    // Expected: initialSupply - burnAmount (subtraction)
    const expectedSupply = initialSupply - burnAmount;

    // The mutant would compute initialSupply / burnAmount, giving a drastically different result
    // The original correctly computes initialSupply - burnAmount
    expect(newSupply).to.equal(expectedSupply);

    // Additional verification: the mutant's division would produce a very small number
    // while subtraction produces a number close to initialSupply
    expect(newSupply).to.be.closeTo(initialSupply, burnAmount);
    expect(newSupply).to.be.lt(initialSupply);
    expect(newSupply).to.equal(initialSupply - burnAmount);
  });
});
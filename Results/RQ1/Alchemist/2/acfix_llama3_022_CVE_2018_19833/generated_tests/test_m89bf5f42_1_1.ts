import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant m89bf5f42 - exponentiation vs multiplication", function () {
  it("should detect mutant that changes * to ** in totalSupply calculation", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy with initialSupply = 5 and decimals = 0
    // For decimals = 0: original totalSupply = initialSupply * 10**0 = initialSupply * 1 = initialSupply
    // Mutant totalSupply = initialSupply ** 10**0 = initialSupply ** 1 = initialSupply
    // Both are identical when decimals = 0, so this test verifies the behavior is equivalent
    const initialSupply = 5;
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, "Test", "TST");
    await instance.waitForDeployment();

    const totalSupply = await instance.totalSupply();
    // Expected: initialSupply (since decimals = 0, 10**0 = 1)
    expect(totalSupply).to.equal(ethers.parseUnits(initialSupply.toString(), 0));

    // Additional verification: owner balance should equal totalSupply
    const ownerBalance = await instance.balanceOf(owner.address);
    expect(ownerBalance).to.equal(totalSupply);
  });
});
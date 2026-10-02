import { expect } from "chai";
import { ethers } } from "hardhat";

describe("ERCDDAToken mutant kill test", function () {
  it("should detect mutant that changes totalSupply calculation from multiplication to addition", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const initialSupply = 1000;
    const instance = await Factory.deploy(initialSupply, "TestToken", "TT");
    await instance.waitForDeployment();

    const totalSupply = await instance.totalSupply();
    const ownerBalance = await instance.balanceOf(owner.address);

    // Original contract: totalSupply = initialSupply * 10**decimals = initialSupply * 1 = initialSupply
    // Mutant: totalSupply = initialSupply + 10**decimals = initialSupply + 1
    // So for initialSupply=1000, original gives 1000, mutant gives 1001
    expect(totalSupply).to.equal(initialSupply);
    expect(ownerBalance).to.equal(initialSupply);
  });
});
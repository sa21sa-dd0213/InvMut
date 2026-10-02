import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant kill test - m872333e5", function () {
  it("should kill mutant by transferring less than full balance (original requires >=, mutant requires ==)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";

    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Owner has 1000 tokens (initialSupply * 10^decimals, decimals=0)
    const ownerBalance = await instance.balanceOf(owner.address);
    expect(ownerBalance).to.equal(ethers.parseUnits("1000", 0));

    // Transfer 100 tokens (less than full balance) - should succeed on original, fail on mutant
    const transferAmount = ethers.parseUnits("100", 0);

    // On original: require(balanceOf[_from] >= _value) => 1000 >= 100 => passes
    // On mutant: require(balanceOf[_from] == _value) => 1000 == 100 => fails
    await expect(
      instance.connect(owner).transfer(addr1.address, transferAmount)
    ).to.be.reverted;
  });
});
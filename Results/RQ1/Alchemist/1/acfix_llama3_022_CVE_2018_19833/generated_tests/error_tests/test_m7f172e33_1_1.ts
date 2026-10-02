import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should detect mutant m7f172e33 by transferring exact full balance and expecting revert", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";

    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Owner has full initial supply (1000 tokens, 0 decimals means 1000 units)
    const ownerBalance = await instance.balanceOf(owner.address);
    expect(ownerBalance).to.equal(ethers.parseEther("1000")); // Actually 1000 units since decimals=0

    // Transfer exact full balance from owner to addr1
    // In original contract: require(balanceOf[_from] >= _value) allows this
    // In mutant: require(balanceOf[_from] > _value) would revert when balances are equal
    await expect(
      instance.transfer(addr1.address, ownerBalance)
    ).to.be.reverted;
  });
});
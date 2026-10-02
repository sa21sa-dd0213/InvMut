import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m8ddb6827 by testing transfer with sufficient balance (balance > value)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";

    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Owner has full supply, transfer 100 tokens to addr1 (balance 1000 > 100)
    const transferAmount = 100;

    // This should succeed on original (balance >= value), but revert on mutant (balance <= value)
    await expect(instance.connect(owner).transfer(addr1.address, transferAmount)).to.not.be.reverted;

    // Verify the transfer actually happened on original contract
    expect(await instance.balanceOf(addr1.address)).to.equal(transferAmount);
    expect(await instance.balanceOf(owner.address)).to.equal(initialSupply * 10**18 - transferAmount);
  });
});
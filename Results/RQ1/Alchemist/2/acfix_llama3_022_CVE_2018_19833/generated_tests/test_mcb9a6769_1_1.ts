import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should detect mutant mcb9a6769: transfer should succeed when recipient has no tokens", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";

    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Owner transfers 100 tokens to addr1
    const transferAmount = 100;
    const tx = await instance.connect(owner).transfer(addr1.address, transferAmount);
    await tx.wait();

    // Verify balances after transfer
    const ownerBalance = await instance.balanceOf(owner.address);
    const addr1Balance = await instance.balanceOf(addr1.address);

    // Expected: owner lost 100 tokens, addr1 gained 100 tokens
    expect(ownerBalance).to.equal(initialSupply * 10 ** 0 - transferAmount);
    expect(addr1Balance).to.equal(transferAmount);
  });
});
import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should detect mutant that removes return true from transfer function", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";

    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Transfer some tokens from owner to addr1
    const transferAmount = 100;
    const tx = await instance.connect(owner).transfer(addr1.address, transferAmount);
    await tx.wait();

    // The original contract returns true on successful transfer
    // The mutant removes the return statement, so calling transfer again and checking the return value will fail
    const result = await instance.connect(owner).transfer.staticCall(addr1.address, 50);
    expect(result).to.equal(true);
  });
});
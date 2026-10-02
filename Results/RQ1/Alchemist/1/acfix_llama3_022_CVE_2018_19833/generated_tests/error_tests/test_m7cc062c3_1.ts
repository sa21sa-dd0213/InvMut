import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should return true on successful transfer - kills mutant m7cc062c3", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Perform a valid transfer and check the return value
    const transferAmount = 100;
    const tx = await instance.transfer(addr1.address, transferAmount);
    const receipt = await tx.wait();

    // The return value of the transfer function should be true
    // Using the tx's value property to get the return value
    const returnValue = await instance.transfer.staticCall(addr1.address, transferAmount);
    expect(returnValue).to.be.true;
  });
});
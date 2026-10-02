import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant mfee3c0e8 by verifying getBalance returns correct balance after sending ETH", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Seed the market to initialize the contract
    await instance.seedMarket(1000, { value: ethers.parseEther("1") });

    // Send ETH to the contract via buyDrugs
    const buyTx = await instance.connect(addr1).buyDrugs({ value: ethers.parseEther("0.5") });
    await buyTx.wait();

    // Get contract balance after deposit
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());

    // Call getBalance - should return the actual contract balance
    const reportedBalance = await instance.getBalance();

    // The mutant returns 0 instead of the actual balance, so this assertion kills the mutant
    expect(reportedBalance).to.equal(contractBalance);
    expect(reportedBalance).to.be.gt(0);
  });
});
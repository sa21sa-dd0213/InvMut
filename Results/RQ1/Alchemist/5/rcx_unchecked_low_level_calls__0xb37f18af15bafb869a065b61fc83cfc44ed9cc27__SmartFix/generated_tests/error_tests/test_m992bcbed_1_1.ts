import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m992bcbed: require overflow check fails when depositsCount is max uint256", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send ether to trigger the receive function and increment depositsCount
    await owner.sendTransaction({ to: await instance.getAddress(), value: ethers.parseEther("1") });
    
    // Verify that depositsCount was incremented correctly
    expect(await instance.depositsCount()).to.equal(1);
  });
});
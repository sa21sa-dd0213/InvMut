import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant mbf21c7a0 by sending non-zero value to addToBalance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial balance for addr1
    const initialBalance = await instance.getBalance(addr1.address);
    expect(initialBalance).to.equal(0);

    // Attempt to add 1 wei to balance - should succeed in original but fail in mutant
    const tx = instance.connect(addr1).addToBalance({ value: ethers.parseEther("0.001") });
    
    // The mutant's require condition (==) will revert when sending any positive value
    await expect(tx).to.be.reverted;
  });
});
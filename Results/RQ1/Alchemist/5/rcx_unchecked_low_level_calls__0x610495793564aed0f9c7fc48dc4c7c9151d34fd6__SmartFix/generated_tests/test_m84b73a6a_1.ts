import { expect } from "chai";
import { ethers } } from "hardhat";

describe("SimpleWallet mutant kill test", function () {
  it("should kill mutant m84b73a6a by sending ether when depositsCount is 0", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send ether to trigger receive() - should succeed in original but fail in mutant
    const tx = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // The mutant changes require(depositsCount+1 >= depositsCount) to require(depositsCount+1 == depositsCount)
    // which is always false for normal depositsCount values, causing revert
    await expect(tx).to.not.be.reverted;
    
    // Verify depositsCount was incremented
    expect(await instance.depositsCount()).to.equal(1);
  });
});
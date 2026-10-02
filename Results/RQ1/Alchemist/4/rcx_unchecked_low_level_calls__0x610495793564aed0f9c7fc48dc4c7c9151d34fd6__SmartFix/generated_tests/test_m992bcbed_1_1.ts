import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should detect mutant m992bcbed by triggering overflow revert on receive()", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the max uint value
    const maxUint = ethers.MaxUint256;

    // Set depositsCount directly to maxUint using ethers provider storage set
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      "0x1", // slot 1 for depositsCount
      ethers.zeroPadValue(ethers.toBeHex(maxUint), 32)
    ]);

    // Now depositsCount is at maxUint
    // Send ether to trigger receive() - should revert on original, pass on mutant
    await expect(
      addr1.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("0.001")
      })
    ).to.be.reverted;

    // Verify the depositsCount is still maxUint (unchanged because tx reverted)
    const depositsCountAfter = await instance.depositsCount();
    expect(depositsCountAfter).to.equal(maxUint);
  });
});
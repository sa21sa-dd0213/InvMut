import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet - Kill mutant m84b73a6a (receive: >= replaced with ==)", function () {
  it("should revert when sending ether to the contract due to the mutant condition", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to send ether to trigger receive() - the mutant require will always revert
    // because (depositsCount + 1) == depositsCount is impossible
    await expect(
      addr1.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("1.0")
      })
    ).to.be.reverted;
  });
});
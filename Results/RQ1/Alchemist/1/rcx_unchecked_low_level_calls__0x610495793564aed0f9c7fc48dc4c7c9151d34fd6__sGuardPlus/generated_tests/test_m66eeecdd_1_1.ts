import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner calls withdrawAll after mutant removes onlyOwner modifier", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send some ether to the contract so there's something to withdraw
    const depositTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await depositTx.wait();

    // Attempt to call withdrawAll from non-owner address
    // In the original contract this would revert due to onlyOwner modifier
    // In the mutant (without modifier) it would succeed, which should be caught
    await expect(
      instance.connect(addr1).withdrawAll()
    ).to.be.reverted;
  });
});
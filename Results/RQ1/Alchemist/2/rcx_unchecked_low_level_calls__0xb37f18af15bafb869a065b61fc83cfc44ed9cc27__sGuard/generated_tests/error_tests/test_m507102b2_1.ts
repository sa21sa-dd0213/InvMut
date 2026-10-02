import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should reject withdrawAll() call from non-owner address (mutant kills onlyOwner modifier)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Non-owner should not be able to call withdrawAll
    await expect(
      instance.connect(addr1).withdrawAll()
    ).to.be.revertedWith(""); // Original contract reverts due to onlyOwner modifier
  });
});
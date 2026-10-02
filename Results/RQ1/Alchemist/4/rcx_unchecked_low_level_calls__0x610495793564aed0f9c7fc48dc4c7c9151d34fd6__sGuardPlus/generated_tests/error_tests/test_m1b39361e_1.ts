import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner calls withdrawAll after onlyOwner modifier is removed", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether so withdrawAll has balance to send
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Attempt to call withdrawAll from a non-owner address
    // On original contract this reverts; on mutant (without require) it succeeds
    await expect(
      instance.connect(addr1).withdrawAll()
    ).to.be.revertedWith(""); // Empty string matches any revert reason
  });
});
import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m0f4ea6e3 by sending ether and verifying depositsCount increases", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initial state
    expect(await instance.depositsCount()).to.equal(0);

    // Send ether via receive() - should succeed in original, fail in mutant
    const tx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await tx.wait();

    // In original, depositsCount becomes 1; in mutant, the transaction reverts
    expect(await instance.depositsCount()).to.equal(1);
    expect(await ethers.provider.getBalance(await instance.getAddress())).to.equal(ethers.parseEther("1.0"));
  });
});
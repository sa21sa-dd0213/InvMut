import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant mb5eb66ba - setWhiteBulk loop condition", function () {
  it("should whitelist multiple addresses when setWhiteBulk is called with an array of addresses", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy DCF with a liquidity receive address
    const liquidityReceiveAddress = addr1.address;
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(liquidityReceiveAddress);
    await instance.waitForDeployment();

    // Set the caller (cfo) to owner to allow setWhiteBulk
    await instance.setCaller(owner.address);

    // Array of addresses to whitelist
    const addressesToWhitelist = [addr1.address, addr2.address];

    // Call setWhiteBulk to whitelist both addresses
    await instance.setWhiteBulk(addressesToWhitelist, true);

    // Verify that both addresses were whitelisted by checking if a transfer from addr1 to addr2
    // (which would normally have fees) does not revert due to blacklist or fee logic
    // First, transfer some tokens to addr1
    const transferAmount = ethers.parseEther("100");
    await instance.transfer(addr1.address, transferAmount);

    // Now try to transfer from addr1 to addr2 - since both are whitelisted, it should succeed
    // If the mutant is present, the whitelist was never set, and the transfer might revert or behave differently
    const instanceAsAddr1 = instance.connect(addr1);
    const transferTx = await instanceAsAddr1.transfer(addr2.address, ethers.parseEther("10"));
    await transferTx.wait();

    // Verify the transfer actually happened
    const addr2Balance = await instance.balanceOf(addr2.address);
    expect(addr2Balance).to.equal(ethers.parseEther("10"));

    // Also verify addr1's balance decreased
    const addr1Balance = await instance.balanceOf(addr1.address);
    expect(addr1Balance).to.equal(ethers.parseEther("90"));
  });
});
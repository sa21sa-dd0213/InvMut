import { expect } from "chai";
import { ethers } } from "hardhat";

describe("DCF mutant mc53690b6 - setBlackBulk access control", function () {
  it("should revert when non-caller tries to call setBlackBulk", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy DCF with a valid liquidity receive address
    const DCF = await ethers.getContractFactory("DCF");
    const dcf = await DCF.deploy(addr1.address);
    await dcf.waitForDeployment();
    
    // Set the caller (cfo) to be the owner
    await dcf.setCaller(owner.address);
    
    // addr1 is not the caller, so calling setBlackBulk should revert
    await expect(
      dcf.connect(addr1).setBlackBulk(
        [addr2.address],
        true
      )
    ).to.be.revertedWith("onlyCaller");
  });
});
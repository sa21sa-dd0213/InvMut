import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant mffe24604 test", function () {
  it("should revert when calling donate() while contract is not open to public", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const whaleAddress = addr2.address;
    const wagerLimit = ethers.parseEther("1");
    
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, wagerLimit);
    await instance.waitForDeployment();

    // Contract is deployed with openToPublic = false (default)
    // Attempt to call donate() before opening to public - should revert in original
    // but the mutant removed the isOpenToPublic() modifier
    await expect(
      instance.connect(addr1).donate({ value: ethers.parseEther("0.5") })
    ).to.be.reverted;
  });
});
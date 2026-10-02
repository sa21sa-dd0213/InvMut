import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant detection - reflection rate invariant", function () {
  it("should verify that balanceOf(owner) equals totalSupply() after deployment, detecting the mutant that changes % to / in _rTotal calculation", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy with mock router and USD token addresses
    // Since we only need to check the initial state, we can use any addresses
    const mockRouter = "0x0000000000000000000000000000000000000001";
    const mockUSDToken = "0x0000000000000000000000000000000000000002";

    const Factory = await ethers.getContractFactory("ANCHToken");
    const instance = await Factory.deploy(mockRouter, mockUSDToken);
    await instance.waitForDeployment();

    // Get total supply (10,000,000 * 10^18 = 10,000,000 ether)
    const totalSupply = await instance.totalSupply();

    // Get owner's balance using balanceOf which internally calls tokenFromReflection
    const ownerBalance = await instance.balanceOf(owner.address);

    // In the original contract, _rTotal is computed as MAX - (MAX % _tTotal)
    // This ensures _rTotal is divisible by _tTotal, making the rate calculation exact
    // In the mutant, _rTotal = MAX - (MAX / _tTotal), which breaks the invariant
    // The owner should have exactly the total supply after minting
    expect(ownerBalance).to.equal(totalSupply);
  });
});